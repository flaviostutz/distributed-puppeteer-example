# distributed-puppeteer-example

Puppeteer example with distributed tests that may be scaled with container instances and monitoring through Prometheus

## Usage

```sh
docker-compose up -d
docker-compose scale tests=10
```
