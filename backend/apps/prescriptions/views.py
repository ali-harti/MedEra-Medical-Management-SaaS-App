from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse
from drf_spectacular.types import OpenApiTypes
from django.utils import timezone
from apps.authentication.permissions import IsMedecin
from .models import Prescription
from .serializers import PrescriptionSerializer

class PrescriptionViewSet(viewsets.ModelViewSet):
    """
    Gestion des ordonnances.
    Seul le médecin peut créer/annuler/voir les ordonnances.
    """
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'patient_record'):
            qs = self.queryset.filter(patient=user.patient_record)
        else:
            qs = self.queryset.filter(doctor=user)
        is_valid = self.request.query_params.get('is_valid')
        if is_valid is not None:
            is_cancelled = is_valid.lower() == 'false'
            qs = qs.filter(is_cancelled=is_cancelled)
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            qs = qs.filter(patient__id=patient_id)
        return qs

    def perform_create(self, serializer):
        prescription = serializer.save(doctor=self.request.user)
        try:
            from apps.core.broadcast import create_and_broadcast_notification
            if prescription.patient and prescription.patient.user:
                create_and_broadcast_notification(
                    recipient=prescription.patient.user,
                    cabinet_doctor=None,
                    notif_type='SYSTEM',
                    title='Nouvelle Ordonnance',
                    message=f'Dr. {prescription.doctor.last_name} a ajouté une nouvelle ordonnance à votre dossier.',
                    action_url='/patient/prescriptions'
                )
        except Exception:
            pass



    @extend_schema(
        tags=['prescriptions'],
        summary='Download prescription as PDF',
        description='Generates and returns a WeasyPrint PDF of the prescription. Filename is UUID-based for security.',
        responses={
            200: OpenApiResponse(
                description='PDF file',
                response=OpenApiTypes.BINARY,
            ),
            403: OpenApiResponse(description='Not your prescription'),
            404: OpenApiResponse(description='Prescription not found'),
        },
    )
    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """
        Génère et retourne le PDF de l'ordonnance.
        Stocke le chemin du PDF après la première génération.
        """
        from django.http import HttpResponse
        from .pdf_generator import generate_prescription_pdf
        import os
        from django.conf import settings
        
        prescription = self.get_object()
        
        try:
            pdf_bytes = generate_prescription_pdf(
                prescription, 
                cancelled=prescription.is_cancelled
            )
        except Exception as e:
            from django.http import JsonResponse
            return JsonResponse(
                {'detail': f'Erreur génération PDF: {str(e)}'},
                status=500
            )
        
        # Stockage du fichier PDF pour archive/cache
        filename = f"prescription_{prescription.id}.pdf"
        pdf_dir = os.path.join(settings.MEDIA_ROOT, 'prescriptions')
        os.makedirs(pdf_dir, exist_ok=True)
        pdf_path = os.path.join(pdf_dir, filename)
        
        with open(pdf_path, 'wb') as f:
            f.write(pdf_bytes)
        
        if not prescription.pdf_path:
            prescription.pdf_path = f"prescriptions/{filename}"
            prescription.save(update_fields=['pdf_path'])
        
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Annule une ordonnance existante.
        Régénère le PDF avec le filigrane "ANNULÉE".
        """
        from .pdf_generator import generate_prescription_pdf
        import os
        from django.conf import settings
        
        prescription = self.get_object()
        if prescription.is_cancelled:
            return Response({'detail': 'Déjà annulée.'}, status=400)
        
        prescription.is_cancelled = True
        prescription.save(update_fields=['is_cancelled'])
        
        # Régénération du PDF avec filigrane
        try:
            pdf_bytes = generate_prescription_pdf(prescription, cancelled=True)
            filename = f"prescription_{prescription.id}_cancelled.pdf"
            pdf_dir = os.path.join(settings.MEDIA_ROOT, 'prescriptions')
            os.makedirs(pdf_dir, exist_ok=True)
            pdf_path = os.path.join(pdf_dir, filename)
            with open(pdf_path, 'wb') as f:
                f.write(pdf_bytes)
            prescription.pdf_path = f"prescriptions/{filename}"
            prescription.save(update_fields=['pdf_path'])
        except Exception:
            # L'échec de régénération PDF ne bloque pas l'annulation métier
            pass
        
        return Response({'detail': 'Ordonnance annulée.'}, status=200)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Petite statistique rapide pour le médecin."""
        count = self.get_queryset().count()
        cancelled = self.get_queryset().filter(is_cancelled=True).count()
        return Response({
            'total': count,
            'active': count - cancelled,
            'cancelled': cancelled
        })
