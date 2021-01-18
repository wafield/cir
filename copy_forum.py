# open manage.py shell
# then: from cir.models import *

src_forum = Forum.objects.get(id=36)
new_url = 'tax4'

new_forum = Forum(
    full_name=src_forum.full_name,
    short_name=src_forum.short_name,
    url=new_url,
    description=src_forum.description,
    access_level=src_forum.access_level,
    phase=src_forum.phase,
    contextmap=src_forum.contextmap,
    forum_logo=src_forum.forum_logo,
    stmt_preamble=src_forum.stmt_preamble
    )
new_forum.save()

for old_folder in EntryCategory.objects.filter(forum=src_forum):
    new_folder = EntryCategory(
        name = old_folder.name, 
        category_type = old_folder.category_type, 
        forum = new_forum, 
        visible = old_folder.visible,
        can_create = old_folder.can_create,
        can_edit = old_folder.can_edit,
        can_delete = old_folder.can_delete,
        can_extract = old_folder.can_extract,
        can_prioritize = old_folder.can_prioritize,
        instructions = old_folder.instructions
    )
    new_folder.save()

for old_doc in Doc.objects.filter(forum=src_forum):
    new_doc = Doc(forum=new_forum,
        title=old_doc.title,
        description=old_doc.description,
        folder = EntryCategory.objects.filter(forum = new_forum, name = old_doc.folder.name)[0]
    )
    new_doc.save()
    for old_docsection in DocSection.objects.filter(doc=old_doc):
        DocSection.objects.create(
            forum=new_forum,
            author=User.objects.get(id=2),
            content=old_docsection.content,
            created_at=old_docsection.created_at,
            updated_at=old_docsection.updated_at,
            title=old_docsection.title,
            doc=new_doc
        )

for theme in ClaimTheme.objects.filter(forum=src_forum):
    ClaimTheme.objects.create(
        forum=new_forum,
        name=theme.name,
        description=theme.description
    )