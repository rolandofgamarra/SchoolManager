import users.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='avatar',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to=users.models.avatar_upload_path,
                verbose_name='foto de perfil',
            ),
        ),
    ]
