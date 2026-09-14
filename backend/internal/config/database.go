package config

import (
"database/sql"
"fmt"
"log"

_ "github.com/lib/pq"
)

func ConnectDB(databaseURL string) *sql.DB {
db, err := sql.Open("postgres", databaseURL)
if err != nil {
log.Fatal("Failed to connect to database:", err)
}

if err := db.Ping(); err != nil {
log.Fatal("Failed to ping database:", err)
}

db.SetMaxOpenConns(25)
db.SetMaxIdleConns(5)

fmt.Println("✅ Database connected")
return db
}
