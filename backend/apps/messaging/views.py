from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Thread, Message, Notification
from .serializers import ThreadSerializer, MessageSerializer, NotificationSerializer

class ThreadViewSet(viewsets.ModelViewSet):
    queryset = Thread.objects.all().prefetch_related('messages', 'messages__sender')
    serializer_class = ThreadSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return self.queryset
        if user.role == 'PATIENT':
            return self.queryset.filter(patient__user=user)
        if user.role == 'MEDECIN':
            return self.queryset.filter(doctor=user)
        if user.role == 'SECRETAIRE':
            employer = getattr(user, 'employer', None)
            return self.queryset.filter(Q(thread_type='CLINICAL', doctor=employer) | Q(thread_type='INTERNAL', secretary=user))
        return self.queryset.none()

    def partial_update(self, request, *args, **kwargs):
        if request.data.get('is_read') is True:
            thread = self.get_object()
            thread.messages.exclude(sender=request.user).filter(is_read=False).update(is_read=True)
            return Response({'status': 'marked as read'})
        return super().partial_update(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        user = request.user
        recipient_id = request.data.get('recipient_id')
        subject = request.data.get('subject')
        content = request.data.get('content')
        thread_type = request.data.get('thread_type', 'CLINICAL')
        
        if not subject or not content or not recipient_id:
            return Response({'detail': 'recipient_id, subject, and content are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        doctor = user if user.role == 'MEDECIN' else (getattr(user, 'employer', None) if user.role == 'SECRETAIRE' else None)
        if not doctor:
            return Response({'detail': 'Only doctors and secretaries can create threads here.'}, status=status.HTTP_403_FORBIDDEN)
            
        if thread_type == 'INTERNAL':
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                recipient_user = User.objects.get(id=recipient_id)
            except User.DoesNotExist:
                return Response({'detail': 'Recipient user not found.'}, status=status.HTTP_404_NOT_FOUND)
            
            if user.role == 'SECRETAIRE' and str(recipient_user.id) == str(doctor.id):
                sec = user
                doc = doctor
            elif user.role == 'MEDECIN' and recipient_user.role == 'SECRETAIRE' and str(getattr(recipient_user, 'employer_id', None)) == str(doctor.id):
                sec = recipient_user
                doc = doctor
            else:
                return Response({'detail': 'Invalid internal recipient.'}, status=status.HTTP_403_FORBIDDEN)
                
            thread = Thread.objects.create(
                thread_type='INTERNAL',
                doctor=doc,
                secretary=sec,
                subject=subject
            )
        else:
            thread = Thread.objects.create(
                thread_type='CLINICAL',
                doctor=doctor,
                patient_id=recipient_id,
                subject=subject
            )
        
        msg = Message.objects.create(
            thread=thread,
            sender=user,
            content=content
        )
        
        # Real-time broadcast
        try:
            from apps.core.broadcast import broadcast_to_cabinet, broadcast_to_user
            doctor = thread.doctor
            if doctor:
                sender_name = request.user.get_full_name() or request.user.email
                payload = {
                    'thread_id': str(thread.id),
                    'thread_subject': thread.subject,
                    'sender': sender_name,
                    'preview': (msg.content or '')[:80],
                    'sent_at': msg.created_at.isoformat(),
                }
                # broadcast to cabinet
                broadcast_to_cabinet(str(doctor.id), 'NEW_MESSAGE', payload)
                # broadcast to patient if applicable
                if thread.patient and thread.patient.user:
                    broadcast_to_user(str(thread.patient.user.id), 'NEW_MESSAGE', payload)
        except Exception:
            pass

        serializer = self.get_serializer(thread)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        thread = self.get_object()
        msgs = thread.messages.all()
        # Mark unread messages from others as read
        msgs.exclude(sender=request.user).filter(is_read=False).update(is_read=True)
        serializer = MessageSerializer(msgs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        thread = self.get_object()
        if thread.is_closed:
            return Response({'detail': 'Thread is closed.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = MessageSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        msg = serializer.save(
            sender=request.user,
            thread=thread
        )

        # Mark other messages in thread as read
        thread.messages.exclude(sender=request.user).filter(is_read=False).update(is_read=True)
        thread.save()

        # Real-time broadcast
        try:
            from apps.core.broadcast import broadcast_to_cabinet, broadcast_to_user
            doctor = thread.doctor
            if doctor:
                sender_name = request.user.get_full_name() or request.user.email
                payload = {
                    'thread_id': str(thread.id),
                    'thread_subject': thread.subject,
                    'sender': sender_name,
                    'preview': (msg.content or '')[:80],
                    'sent_at': msg.created_at.isoformat(),
                }
                broadcast_to_cabinet(str(doctor.id), 'NEW_MESSAGE', payload)
                if thread.patient and thread.patient.user:
                    broadcast_to_user(str(thread.patient.user.id), 'NEW_MESSAGE', payload)
        except Exception:
            pass

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        thread = self.get_object()
        thread.is_closed = True
        thread.save()
        return Response({'detail': 'Thread closed.'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        threads = self.get_queryset()
        unread = threads.filter(messages__sender__isnull=False).exclude(messages__sender=request.user).filter(messages__is_read=False).distinct().count()
        return Response({'unread_count': unread})

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': 'All notifications marked as read'})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'Notification marked as read'})
