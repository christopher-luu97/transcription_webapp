from django.http import HttpResponseBadRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .transcribe import Transcribe
from .download import Download
from rest_framework import viewsets
from .models import File
from .serializers import MediaFileSerializer
import asyncio

@csrf_exempt
def transcribe(request):
    """
    API to handle transcription service

    Args:
        request (file): File object of form data

    Returns:
        JsonResponse: Formatted JsonResponse object on success
    """
    if request.method == 'POST' and 'file' in request.FILES:
        file = request.FILES['file']
        transcriber = Transcribe()

        # Save the file to the storage and get its ID
        file_instance = File(file=file)
        file_instance.save()
        file_id = file_instance.id

        data = file_instance
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        data = loop.run_until_complete(transcriber.transcribe_file(file))
        if data is not None:
            response_data = {
                'status': 'success',
                'message': 'File received and processed successfully',
                'data': data
            }
            return JsonResponse(response_data)
        else:
            return HttpResponseBadRequest("Failed to transcribe the file")
    else:
        return HttpResponseBadRequest("No file received")

@csrf_exempt
def download(request):
    if request.method == 'POST' and 'file' in request.FILES:
        file = request.FILES['file']
        downloader = Download()
        format = request.POST.get("format")
        data = request.POST.get("data")
        response = downloader.download(format, data)
        return response


class FileView(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = MediaFileSerializer