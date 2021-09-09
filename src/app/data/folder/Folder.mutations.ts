import { Arg, Field, ObjectType } from 'type-graphql';
import { CueModel } from '../cue/mongo/Cue.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { FolderModel } from './mongo/folder.model';

/**
 * Folder Mutation Endpoints
 */
@ObjectType()
export class FolderMutationResolver {

    @Field(type => Boolean, {
        description: 'Used when you want to update unread messages count.'
    })
    public async create(
        @Arg('cueIds', type => [String]) cueIds: string[]
    ) {
        try {
            const folder = await FolderModel.create({ cueIds })
            await CueModel.updateMany({ _id: { $in: cueIds } }, { folderId: folder._id })
            await ModificationsModel.updateMany({ cueId: { $in: cueIds } }, { folderId: folder._id })
            return true;
        } catch (e) {
            return false
        }
    }

    @Field(type => Boolean, {
        description: 'Used when you want to update unread messages count.'
    })
    public async update(
        @Arg('cueIds', type => [String]) cueIds: string[],
        @Arg('folderId', type => String) folderId: string,
    ) {
        try {

            const f = await FolderModel.findById(folderId)
            if (f) {
                const folder = f.toObject()
                const toAdd: any[] = []
                const toRemove: any[] = []

                console.log(folder)

                cueIds.map((id: any) => {
                    const found = folder.cueIds.find((item: any) => {
                        return item === id
                    })
                    if (!found) {
                        toAdd.push(id)
                    }
                })

                folder.cueIds.map((item: any) => {
                    const found = cueIds.find((id: any) => {
                        return item === id
                    })
                    if (!found) {
                        toRemove.push(item)
                    }
                })

                console.log(toAdd)
                console.log(toRemove)

                await CueModel.updateMany({ _id: { $in: toAdd } }, { folderId: folder._id })
                await CueModel.updateMany({ _id: { $in: toRemove } }, { folderId: undefined })

                await ModificationsModel.updateMany({ cueId: { $in: toAdd } }, { folderId: folder._id })
                await ModificationsModel.updateMany({ cueId: { $in: toRemove } }, { folderId: undefined })

                await FolderModel.updateOne({ _id: folder._id }, { cueIds })
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
