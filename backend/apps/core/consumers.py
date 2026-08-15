import json
from channels.generic.websocket import AsyncWebsocketConsumer
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
import jwt
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()

class CabinetConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        query_string = self.scope['query_string'].decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        if not token:
            await self.close()
            return

        user = await self.get_user_from_token(token)
        if not user:
            await self.close()
            return

        self.user = user
        self.personal_group = f"user_{user.id}"

        # Join personal group (for targeted notifications, e.g. for Patients)
        await self.channel_layer.group_add(
            self.personal_group,
            self.channel_name
        )

        # Join cabinet group if applicable (for Doctors and Secretaries)
        cabinet_doctor = await self.get_cabinet_doctor(user)
        if cabinet_doctor:
            self.group_name = f"cabinet_{cabinet_doctor.id}"
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'personal_group'):
            await self.channel_layer.group_discard(
                self.personal_group,
                self.channel_name
            )
        if hasattr(self, 'group_name'):
            # Leave cabinet group
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    # Receive message from WebSocket (if client sends something)
    async def receive(self, text_data):
        pass

    # Receive message from group
    async def cabinet_message(self, event):
        message = event['message']
        event_type = event.get('event_type', 'MESSAGE')

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': event_type,
            'data': message
        }))

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get('user_id')
            return User.objects.get(id=user_id)
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, User.DoesNotExist):
            return None

    @database_sync_to_async
    def get_cabinet_doctor(self, user):
        return user.get_cabinet_doctor()

class AdminDashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        query_string = self.scope['query_string'].decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        if not token:
            await self.close()
            return

        user = await self.get_user_from_token(token)
        if not user or user.role != 'ADMIN':
            await self.close()
            return

        self.user = user
        self.group_name = "admin_dashboard"

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        pass

    async def dashboard_update(self, event):
        event_type = event.get('event_type', 'REFRESH')
        await self.send(text_data=json.dumps({
            'type': event_type,
            'data': event.get('data', {})
        }))

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get('user_id')
            return User.objects.get(id=user_id)
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, User.DoesNotExist):
            return None
