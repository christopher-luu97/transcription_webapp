from django.shortcuts import render
from django.http import HttpResponseBadRequest, JsonResponse, multipartparser
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def transcribe(request):
    if request.method == 'POST' and 'file' in request.FILES:
        file = request.FILES['file']
        # Do further processing with the file, such as transcription

        # Example response
        response_data = {
            'status': 'success',
            'message': 'File received and processed successfully'
        }
        return JsonResponse(response_data)
    else:
        return HttpResponseBadRequest("No file received")