import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
// import { MessageStatusModel } from './mongo/folder.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { CueModel } from '../cue/mongo/Cue.model';
import { FolderModel } from './mongo/folder.model';
import { FolderObject } from './types/Folder.type';
import { CueObject } from '../cue/types/Cue.type';

/**
 * Message Status Query Endpoints
 */
@ObjectType()
export class FolderQueryResolver {

    @Field(type => [FolderObject], {
        description: "Used to find one user by id."
    })
    public async getFoldersForChannel(
        @Arg("channelId", type => String)
        channelId: string
    ) {
        try {
            
            const channelCues = await CueModel.find({
                channelId
            });

            const folderIdSet = new Set();

            channelCues.map((cue: any) => {
                const obj = cue.toObject();
                if (obj.folderId) {
                    folderIdSet.add(obj.folderId)
                }
                
            })

            const folderIds = Array.from(folderIdSet);

            const folders = await FolderModel.find({
                _id: { $in: folderIds }
            })

            return folders;

        } catch (e) {
            console.log(e)
            return 0
        }
    }

    @Field(type => FolderObject, {
        description: "Used to find one user by id."
    })
    public async findById(
        @Arg("folderId", type => String)
        folderId: string,
    ) {
        const folder = await FolderModel.findById(folderId);

        return folder;
        
    }

    

    @Field(type => [CueObject], {
        description: "Used to find one user by id."
    })
    public async getCuesById(
        @Arg("folderId", type => String)
        folderId: string,
        @Arg("userId", type => String)
        userId: string
    ) {

        const folder = await FolderModel.findById(folderId);

        if (!folder) return [];

        const cues = await ModificationsModel.find({
            cueId: { $in: folder.cueIds },
            userId
        })

        // Sort the cues in order;

        const cuesInOrder = folder.cueIds.map((id: any) => {
            const found = cues.find((item: any) => {
                return item.cueId.toString() === id.toString()
            })
            return found;
        })

        return cuesInOrder;

    }

}