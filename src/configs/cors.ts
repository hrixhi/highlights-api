import app from "@config/app";

export default {
	origins: [app.frontEndUrl, app.frontEndUrlLive,app.webLocalUrl,app.webLive],
	credentials: true,
};
