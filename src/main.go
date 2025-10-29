package main

import (
  "context"
  "log"
  "net/http"
  "os"
  "os/signal"
  "syscall"
  "time"
)

func main() {
  mux := http.NewServeMux()
  mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    _, _ = w.Write([]byte("ok"))
  })

  srv := &http.Server{Addr: ":8080", Handler: mux}

  go func() {
    if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
      log.Fatal(err)
    }
  }()

  sig := make(chan os.Signal, 1)
  signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
  <-sig

  ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
  defer cancel()
  _ = srv.Shutdown(ctx)
}
