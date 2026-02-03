package main

import (
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// Struktur pesan untuk semua fitur
type Message struct {
	Type      string `json:"type"` // START_SESSION, VOTE, QUEUE_REQUEST, NEXT_QUEUE, CHAT, RESET
	Username  string `json:"username"`
	Payload   string `json:"payload"`   // Untuk Chat atau Vote Value
	Reason    string `json:"reason"`    // <--- TAMBAHKAN BARIS INI
	Timestamp int64  `json:"timestamp"` // Untuk urutan antrian presisi
	Duration  int    `json:"duration"`  // Untuk timer cek ombak
}

var clients = make(map[*websocket.Conn]bool)
var broadcast = make(chan Message)
var mutex = &sync.Mutex{}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	defer ws.Close()

	mutex.Lock()
	clients[ws] = true
	mutex.Unlock()

	for {
		var msg Message
		err := ws.ReadJSON(&msg)
		if err != nil {
			mutex.Lock()
			delete(clients, ws)
			mutex.Unlock()
			break
		}
		broadcast <- msg
	}
}

func handleMessages() {
	for {
		msg := <-broadcast
		mutex.Lock()
		for client := range clients {
			err := client.WriteJSON(msg)
			if err != nil {
				client.Close()
				delete(clients, client)
			}
		}
		mutex.Unlock()
	}
}

func main() {
	// Sajikan file statis (html, js)
	// Pastikan baris ini ada di dalam function main()
	// Pastikan baris ini ada di dalam function main()
	http.Handle("/", http.FileServer(http.Dir("./public")))
	http.HandleFunc("/ws", handleConnections)

	go handleMessages()

	fmt.Println("Server EduSync berjalan di http://localhost:8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
