import json

from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponse
from django.utils import timezone
from django.contrib.auth.signals import user_logged_in

from cir.models import *

VISITOR_ROLE = 'visitor'

def login_view(request):
    response = {}
    email = 'yxt157@ist.psu.edu' # request.REQUEST.get('email').lower()
    password = 'ytt' # request.REQUEST.get('password')
    users = User.objects.filter(username=email)
    if users.count() != 1:
        return HttpResponse("Your user name and/or password is incorrect.", status=403)
    user = authenticate(username=users[0].username, password=password)
    if user:
        login(request, user)
        # request.session['user_id'] = user.id
        response['user_id'] = user.id
        response['user_name'] = user.get_full_name()
        request.session['role'] = VISITOR_ROLE
        try:
            forum = Forum.objects.get(id=request.session['forum_id'])
            if request.session['forum_id'] != -1:
                request.session['role'] = Role.objects.get(user=user, forum=forum).role
        except:
            pass
        response['role'] = request.session['role']
        return HttpResponse(json.dumps(response), mimetype='application/json')
    else:
        return HttpResponse("Your user name and/or password is incorrect.", status=403)


def register(request):
    response = {}
    email = request.REQUEST.get('email').lower()
    if User.objects.filter(username=email).count() > 0:
        return HttpResponse("This user already exists; please sign in.", status=403)
    password = request.POST['password']
    description = request.POST['description']
    user = User.objects.create_user(email, email, password)
    user.first_name = request.POST['first-name']
    user.last_name = request.POST['last-name']
    user.save()
    userinfo = UserInfo(user=user, description=description, last_visited_forum=None)
    userinfo.save()
    user = authenticate(username=email, password=password)
    if user:
        login(request, user)
        # request.session['user_id'] = user.id
        response['user_id'] = user.id
        response['user_name'] = user.get_full_name()
        response['role'] = VISITOR_ROLE
        return HttpResponse(json.dumps(response), mimetype='application/json')
    else:
        return HttpResponse("Unknown error.", status=403)


def logout_view(request):
    forum_id = request.session['forum_id']
    logout(request)
    # request.session['user_id'] = -1
    request.session['forum_id'] = forum_id
    return HttpResponse(json.dumps({}), mimetype='application/json')


def change_info(request):
    if not request.user.is_authenticated():
        return HttpResponse("Please log in first.", status=403)
    user = request.user
    action = request.REQUEST.get('action')
    if action == 'get':
        response = {}
        response['first_name'] = user.first_name
        response['last_name'] = user.last_name
        response['email'] = user.email
        response['description'] = user.info.description
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'set-pw':
        old_pw = request.REQUEST.get('old_password')
        if not user.check_password(old_pw):
            return HttpResponse("Password incorrect.", status=403)
        new_pw = request.REQUEST.get('new_password')
        user.set_password(new_pw)
        user.save()
        return HttpResponse(json.dumps({}), mimetype='application/json')
    if action == 'set-info':
        response = {}
        user.first_name = request.REQUEST.get('first-name')
        user.last_name = request.REQUEST.get('last-name')
        user.info.description = request.REQUEST.get('description')
        user.info.save()
        user.save()
        response['user_name'] = user.get_full_name()
        return HttpResponse(json.dumps(response), mimetype='application/json')
