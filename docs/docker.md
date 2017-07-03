# Running on Docker

With Docker, it's easy to run Staticman on any environment without downloading, configuring or installing anything manually on your host other than Docker and Docker Compose.

First, you need to install [Docker](https://docs.docker.com/engine/installation/) and [Docker Compose](https://docs.docker.com/compose/install/).

## Production

In production mode, the project source is imported and dependencies installed to the container.

To start the service:  

```shell
docker-compose up
```

## Development

In development mode, the source code is mounted from the host. You can see any changes you made in the sources by simply restarting the container.

To start the service: 

```shell 
docker-compose -f docker-compose.development.yml up
```

## Usage

Use your IP address or `localhost` as the Staticman API address.