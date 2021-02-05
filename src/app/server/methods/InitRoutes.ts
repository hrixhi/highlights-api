// import * as AWS from 'aws-sdk';
// import Busboy from 'busboy';
// import * as expresszip from 'express-zip';
// import { GraphQLServer } from 'graphql-yoga';
// import * as s3zip from 's3-zip'

// /**
//  * This is the function used to initializeroutes that is going to let uses upload to the s3 bucket.
//  * Either third party pdfs or images for the events
//  */
// export function initializeRoutes(GQLServer: GraphQLServer) {

//     /**
//      * This is used for uploading tickets (pdfs)
//      */
//     GQLServer.post("/docxupload", (req: any, res: any) => {
//         // this body field is used for recognizition if attachment is EventImage, Asset or simillar.
//         const busboy = new Busboy({ headers: req.headers });
//         // The file upload has completed
//         busboy.on("finish", () => {
//             let file;
//             try {
//                 // Grabs your file object from the request.
//                 file = req.files.attachment;
//                 console.log(file)
//             } catch (e) {
//                 console.log(e)
//             }

//             res.json({
//                 status: "ok",
//                 HTML: "ok"
//             });

//         });
//         req.pipe(busboy);
//     });
// }
