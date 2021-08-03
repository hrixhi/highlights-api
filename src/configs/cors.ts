import app from "@config/app";

export default {
	origin: [app.frontEndUrl, app.frontEndUrlLive],
	credentials: true,
};
