FROM golang:1.25.4 AS builder
WORKDIR /src

COPY go.mod ./
RUN go env -w GOPROXY=https://proxy.golang.org,direct

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /app/area-backend ./src

FROM scratch
COPY --from=builder /app/area-backend /area-backend

EXPOSE 8080
ENTRYPOINT ["/area-backend"]
