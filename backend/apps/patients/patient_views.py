"""
Patient portal views — read-only, own data only (RG-AUTH-05).
PATIENT role can only see their own records.
These views are separate from the main PatientViewSet to keep RBAC logic clean and explicit.
"""
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from apps.authentication.permissions import IsPatient
from .models import Patient
from .serializers import PatientSerializer

class PatientOwnRecordView(generics.RetrieveAPIView):
    """
    UC-PATIENT-02: PATIENT views their own dossier.
    GET /api/patient-portal/dossier/
    Returns the Patient record associated with this user's email.
    RG-AUTH-05: only own data, read-only.
    """
    permission_classes = [IsAuthenticated, IsPatient]
    serializer_class = PatientSerializer
    
    def get_object(self):
        """
        Find the Patient record that matches this user's email.
        A patient user's email matches their Patient.email field.
        """
        try:
            return Patient.objects.get(
                email=self.request.user.email,
                is_archived=False
            )
        except Patient.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Aucun dossier patient associé à ce compte.")
