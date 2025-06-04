import { ENV } from "./config/env";
import app from "./app";

app.listen(ENV.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${ENV.PORT}`);
});
