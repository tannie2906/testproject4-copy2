from django.contrib import admin
from .models import File, Folder, Profile
from django.contrib import admin
from django.http import JsonResponse


# Register your models here.
#@admin.register(Folder)
#class FolderAdmin(admin.ModelAdmin):
  #  list_display = ('name', 'path', 'parent_folder', 'user', 'created_at', 'parent_name')
   # search_fields = ('name', 'path')

#try:
  #  admin.site.unregister(Folder)
#except admin.sites.NotRegistered:
 #   pass

#admin.site.register(Folder, FolderAdmin)

@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'size', 'file_path', 'user_id')  # Use user_id
    search_fields = ('file_name', 'file_path')


@admin.action(description="Unlock 2FA for selected users")
def unlock_2fa(modeladmin, request, queryset):
    for profile in queryset:
        profile.otp_locked = False
        profile.otp_failed_attempts = 0
        profile.save()
    modeladmin.message_user(request, f"2FA unlocked for {queryset.count()} user(s).")

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'otp_locked', 'otp_failed_attempts')
    actions = [unlock_2fa]