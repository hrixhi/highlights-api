export default {
	appId: "",
	logging: {
		level: "info",
	},
	frontEndUrl: "http://localhost:3000",
	webLocalUrl:"http://localhost:19006",
	webLive:"https://web.cuesapp.co",
	frontEndUrlLive: "http://navrachana.cuesapp.co",
};

export const APP_ID = process.env.APP_ID;
export const LOG_LEVEL = process.env.LOG_LEVEL;
export const FRONTEND_URL = process.env.FRONTEND_URL;
export const JWT_SECRET =
	process.env.APP_SECRET || "thisIsTotallySecretAndForDevOnly";
