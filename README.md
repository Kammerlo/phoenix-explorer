# Cardano Explorer Frontend
This repository houses an open source Cardano Explorer. It is based on the [Cardano Foundation Explorer](https://github.com/cardano-foundation/cf-explorer-frontend). 
The idea behind this repository is to maintain and continue the development of this open source project. Currently there is no other open source Explorer available in the Cardano Ecosystem. 
We want to keep this running and develop it further with the community.

Currently this explorer is deployed here: [Cardano Explorer](https://cardano-explorer.xyz)
We are still in heavy development and will add more features in the future. 

This explorer is a frontend only application. We will implement different API connectors to plug it on top of already existing publics APIs. 
Currently we ony support [Yaci-Store](https://github.com/bloxbean/yaci-store) API. We will add more API connectors in the future. 
For example Blockfrost is planned to be added soon.

Relying only on public APIs comes with a downside as well. We are not able to provide all the features that are available in the official Cardano Beta Explorer, since we don't have aggregated data.
In this application we will only show what is available in the respective APIs.

### Contributing is appreciated
If you need any new features or have any ideas, feel free to open an issue or create a pull request. 
We are happy to work with you on this project, since we want to keep this project alive and running in collaboration with everyone from the Cardano Ecosystem.


## Prerequisites

In order to build and run everything you will need:

- Node version: ^v14.19.0 ([^v16.16.0](https://nodejs.org/en/blog/release/v16.16.0/) recommended)
- npm: ^6.14.17

## Install and run

Install the app with npm (it's work well with `yarn` but we using npm in here):

**Step 1**: Install packages
Open terminal and run commad: `npm install`

**Step 2**: Create .env file from .env.example
In the terminal run command: `cp .env.example .env`

**Step 3** Update env variables:

- Update port for application.

  > Example: `PORT=3000`

- Update API Connector Type. Currently we only support `YACI` API. We will add more API connectors in the future.

  > Example: `REACT_APP_API_TYPE=YACI`

- Update API URL for the Basi API Service you want to use.

  > Example: `REACT_APP_API_URL=http://localhost:8080`

- Update application network (`mainnet`, `preprod` or `preview`)

  > Example: `REACT_APP_NETWORK=mainnet`

**Step 4** Run on localhost

Runs the app in the development mode.
Open terminal and run command: `npm start`

The application will run by default on port 3000. If you want to run the application on another port, please change the `PORT` in the .env file.

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Build into production

Execute `npm run build`

Builds the app for production to the `build` folder.
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.
Your app is ready to be deployed!
