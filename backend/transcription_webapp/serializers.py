from django.core.validators import FileExtensionValidator
from rest_framework import serializers
from transcription_webapp.models import MediaFile

class MediaFileSerializer(serializers.Serializer):
    # This does not validate the content of the data itself, just the extension!
    audio_file = serializers.FileField(
        validators=[FileExtensionValidator(allowed_extensions=['wav', 'mp3', 'mp4'])])

    class Meta:
        model = MediaFile
        read_only_fields = ('id')
        fields = '__all__'