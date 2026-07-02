# from django.shortcuts import render

# # Create your views here.
from django.http import JsonResponse

def profile(request):
    return JsonResponse({
        "username": "testuser",
        "email": "test@example.com",
        "phone": "012345678"
    })