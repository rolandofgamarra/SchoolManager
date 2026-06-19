from rest_framework import serializers
from tenants.models import Institution

class InstitutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = ['id', 'nombre', 'logo_url', 'config_json', 'created_at']
        read_only_fields = ['id', 'created_at']
