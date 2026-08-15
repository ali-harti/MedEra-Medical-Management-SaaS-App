from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0004_user_phone'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='avatar',
            field=models.FileField(blank=True, null=True, upload_to='avatars/'),
        ),
    ]
