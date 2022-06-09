import { Document, Model, model } from 'mongoose';
import { zoomRegistrationSchema } from './zoom-registration.schema';

export interface IZoomRegistrationModel extends Document {
    zoomRegistrationId: string;
    zoomMeetingId: string;
    userId: string;
    channelId: string;
    zoom_join_url: string;
    registrant_id: string;
}

export const ZoomRegistrationModel: Model<IZoomRegistrationModel> = model<IZoomRegistrationModel>(
    'zoom-registration',
    zoomRegistrationSchema
);
