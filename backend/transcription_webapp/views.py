from django.http import HttpResponseBadRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .transcribe import Transcribe
from asgiref.sync import sync_to_async
from rest_framework import viewsets
from .models import File
from .serializers import MediaFileSerializer
import asyncio

from asgiref.sync import sync_to_async, async_to_sync


@csrf_exempt
def transcribe(request):
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


class FileView(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = MediaFileSerializer