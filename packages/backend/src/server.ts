import { ENV } from "./config/env";
import app from "./app";

app.listen(ENV.PORT, ENV.HOST, () => {
    console.log(`🚀 Server running on http://${ENV.HOST}:${ENV.PORT}`);
});
