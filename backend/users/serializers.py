from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from users.models import User, Teacher, Parent


class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'tenant', 'avatar_url']
        read_only_fields = ['id', 'role', 'tenant', 'avatar_url']

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url
        return None


class AvatarUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['avatar']

    def validate_avatar(self, value):
        max_size = 2 * 1024 * 1024  # 2 MB
        if value.size > max_size:
            raise serializers.ValidationError('El archivo no puede superar 2 MB.')
        allowed = ['image/jpeg', 'image/png', 'image/webp']
        if value.content_type not in allowed:
            raise serializers.ValidationError('Formato no permitido. Usá JPG, PNG o WebP.')
        return value


class TeacherSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Teacher
        fields = ['id', 'user', 'departamento', 'idioma', 'tenant']
        read_only_fields = ['id', 'tenant']


class ParentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Parent
        fields = ['id', 'user', 'students', 'tenant']
        read_only_fields = ['id', 'tenant']


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):  # pylint: disable=W0223
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['tenant_id'] = user.tenant.id if user.tenant else None
        token['email'] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        request = self.context.get('request')
        avatar_url = None
        if self.user.avatar:
            avatar_url = request.build_absolute_uri(self.user.avatar.url) if request else self.user.avatar.url
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': self.user.role,
            'tenant_id': self.user.tenant.id if self.user.tenant else None,
            'avatar_url': avatar_url,
        }
        return data
