import { Arg, Field, ObjectType } from 'type-graphql';
import { CueModel } from '../cue/mongo/Cue.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { FolderModel } from './mongo/folder.model';

/**
 * Folder Mutation Endpoints
 */
@ObjectType()
export class FolderMutationResolver {

    @Field(type => String, {
        description: 'Used when you want to update unread messages count.'
    })
    public async create(
        @Arg('title', type => String) title: string,
        @Arg('cueIds', type => [String]) cueIds: string[]
    ) {
        try {
            const folder = await FolderModel.create({ title, cueIds })

            if (!folder) return ''
            await CueModel.updateMany({ _id: { $in: cueIds } }, { folderId: folder._id })
            await ModificationsModel.updateMany({ cueId: { $in: cueIds } }, { folderId: folder._id })
            
            return folder._id.toString();
        } catch (e) {
            return ''
        }
    }

    @Field(type => Boolean, {
        description: 'Used when you want to update unread messages count.'
    })
    public async addToFolder(
        @Arg('cueId', type => String) cueId: string,
        @Arg('folderId', type => String) folderId: string
    ) {
        try {

            if (!folderId) return;
            
            const folder = await FolderModel.updateOne({
                _id: folderId
            }, {
                $addToSet: { cueIds: cueId }
            })

            if (folder.nModified > 0) {
                await CueModel.updateOne({ _id: cueId }, { folderId })
                await ModificationsModel.updateMany({ cueId: cueId }, { folderId }) 
            }


           return folder.nModified > 0;

        } catch (e) {
            return false
        }
    }

    @Field(type => Boolean, {
        description: 'Used when you want to update unread messages count.'
    })
    public async delete (
        @Arg('folderId', type => String) folderId: string,
    ) {

        try {

            const folder = await FolderModel.findById(folderId);

            if (!folder) return;

            const cueIds = folder.cueIds;

            cueIds.map(async (cueId: string) => {
                await CueModel.updateOne({
                    _id: cueId
                }, {
                    folderId: ''
                })

                await ModificationsModel.updateMany({
                    cueId
                }, 
                {
                    folderId: ''
                })
            })

            await FolderModel.deleteOne({
                _id: folderId
            })

            return true

        } catch (e) {
            return false
        }
        
       

    }   

    @Field(type => Boolean, {
        description: 'Used when you want to update unread messages count.'
    })
    public async removeFromFolder (
        @Arg('cueId', type => String) cueId: string,
        @Arg('folderId', type => [String]) folderId: string[]
    ) {

        const updateFolder = await FolderModel.updateOne({
            _id: folderId
        }, {
            $pull: { cueIds: cueId }
        })

        const updateCue = await CueModel.updateOne({
            _id: cueId
        }, {
            folderId: ""
        }) 


        if (updateFolder.nModified > 0) {
            return false;
        }

        return updateFolder.nModified > 0;
    }



    @Field(type => Boolean, {
        description: 'Used when you want to update unread messages count.'
    })
    public async update(
        @Arg('title', type => String) title: string,
        @Arg('cueIds', type => [String]) cueIds: string[],
        @Arg('folderId', type => String) folderId: string,
    ) {
        try {

            const f = await FolderModel.findById(folderId)
            if (f) {
                const folder = f.toObject()
                const toAdd: any[] = []
                const toRemove: any[] = []

                cueIds.map((id: any) => {
                    const found = folder.cueIds.find((item: any) => {
                        return item.toString() === id.toString()
                    })
                    if (!found) {
                        toAdd.push(id.toString())
                    }
                })

                folder.cueIds.map((item: any) => {
                    const found = cueIds.find((id: any) => {
                        return item.toString() === id.toString()
                    })
                    if (!found) {
                        toRemove.push(item.toString())
                    }
                })


                await CueModel.updateMany({ _id: { $in: toAdd } }, { folderId: folder._id })
                await CueModel.updateMany({ _id: { $in: toRemove } }, { folderId: undefined })

                await ModificationsModel.updateMany({ cueId: { $in: toAdd } }, { folderId: folder._id })
                await ModificationsModel.updateMany({ cueId: { $in: toRemove } }, { folderId: undefined })

                await FolderModel.updateOne({ _id: folder._id }, { cueIds, title })
            } else {
                return false
            }

            return true;

        } catch (e) {
            console.log(e)
            return false
        }
    }

}
