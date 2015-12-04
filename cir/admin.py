from django.contrib import admin

from models import *

def user_unicode(self):
    return  u'%s %s (%s)' % (self.first_name, self.last_name, self.email)
User.__unicode__ = user_unicode

class UserAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email', 'date_joined')

class ForumAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'url', 'access_level', 'phase')


class RoleAdmin(admin.ModelAdmin):
    def author_name(self):
        return "%s %s" % (self.user.first_name, self.user.last_name)

    list_display = (author_name, 'forum', 'role')
    list_filter = ('forum', )

class HighlightAdmin(admin.ModelAdmin):

    def context_type(self):
        try:
            DocSection.objects.get(id=self.context.id)
            return 'DocSection'
        except DocSection.DoesNotExist:
            return 'Post'
    def context_content(self):
        try:
            return DocSection.objects.get(id=self.context.id).title
        except:
            return self.context.content[:100]
    def forum(self):
        return self.context.forum
    list_display = (forum, context_type, context_content, 'author', 'is_nugget', 'created_at')
    list_filter = ('forum', )

class DocAdmin(admin.ModelAdmin):
    pass

class TagAdmin(admin.ModelAdmin):
    list_display = ('content', 'author', 'claimTheme')

class DocSectionAdmin(admin.ModelAdmin):
    pass


class EntryCategoryAdmin(admin.ModelAdmin):
    pass


class ClaimThemeAdmin(admin.ModelAdmin):
    list_filter = ('forum', )
    pass


class ClaimVersionAdmin(admin.ModelAdmin):
    pass


class ClaimAdmin(admin.ModelAdmin):
    def author_name(self):
        return "%s %s" % (self.author.first_name, self.author.last_name)

    def claim_content(self):
        return '<a href="../claimversion/%d">%s</a>' % (self.adopted_version().id, self.adopted_version().content)

    def version_author(self):
        return "%s %s" % (self.adopted_version().author.first_name, self.adopted_version().author.last_name)

    def delegator_name(self):
        if self.delegator:
            return "%s %s" % (self.delegator.first_name, self.delegator.last_name)
        return '(None)'

    def duplicate(modeladmin, request, queryset):
        for object in queryset:
            object.id = None
            object.save()

    duplicate.short_description = "Duplicate selected claim"
    actions = [duplicate]

    author_name.short_description = 'Author of claim'
    claim_content.short_description = 'Content of adopted version'
    claim_content.allow_tags = True
    version_author.short_description = 'Author of adopted version'
    list_display = (author_name, delegator_name, version_author, claim_content, 'claim_category', 'theme', 'created_at')
    list_filter = ('forum', 'claim_category', 'theme')
    ordering = ('-created_at', )

class PostAdmin(admin.ModelAdmin):
    def author_name(self):
        return "%s %s" % (self.author.first_name, self.author.last_name)

    author_name.short_description = 'Author of post'
    def delegator_name(self):
        if self.delegator:
            return "%s %s" % (self.delegator.first_name, self.delegator.last_name)
        return '(None)'
    def target(self):
        if self.highlight:
            return '<a href="../highlight/%d">Highlight object</a>' % self.highlight.id
        if self.target_entry:
            try:
                post = Post.objects.get(id=self.target_entry.id)
                return '<a href="../post/%d">Post #%d</a>' % (post.id, post.id)
            except Post.DoesNotExist:
                try:
                    claim = Claim.objects.get(id=self.target_entry.id)
                    return '<a href="../claim/%d">Claim #%d</a>' % (claim.id, claim.id)
                except Claim.DoesNotExist:
                    return 'Unknown entry type'
        if self.target_event:
            try:
                vote = Vote.objects.get(id=self.target_event.id)
                return '<a href="../vote/%d">Vote #%d (%s)</a>' % (vote.id, vote.id, vote.vote_type)
            except Vote.DoesNotExist:
                return 'Unknown event type'
        return 'Unknown type'

    target.allow_tags = True
    list_display = (author_name, delegator_name, 'title', 'content', target, 'content_type', 'created_at')
    list_filter = ('forum', 'content_type')
    ordering = ('-created_at', )

admin.site.register(Forum, ForumAdmin)
admin.site.register(Role, RoleAdmin)
admin.site.unregister(User)
admin.site.register(User, UserAdmin)
admin.site.register(Doc, DocAdmin)
admin.site.register(DocSection, DocSectionAdmin)
admin.site.register(ClaimTheme, ClaimThemeAdmin)
admin.site.register(Claim, ClaimAdmin)
admin.site.register(Post, PostAdmin)
admin.site.register(ClaimVersion, ClaimVersionAdmin)
admin.site.register(Highlight, HighlightAdmin)
admin.site.register(Tag, TagAdmin)
