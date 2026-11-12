// Penumbra en un solo archivo: lleva el curso dentro, lo sirve solo para este ordenador y abre el navegador.
package main

import (
	"bytes"
	"embed"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path"
	"runtime"
	"strings"
	"sync/atomic"
	"time"
)

//go:embed all:sitio
var todo embed.FS

// Siempre el mismo puerto: el navegador guarda el progreso por dirección, y así no se pierde entre usos.
const puerto = 47615

// Windows puede tener mal registrado el tipo de .js, y sin el tipo correcto el navegador rechaza los módulos.
var tipos = map[string]string{".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp"}

// El latido avisa de que la página sigue abierta: cerrada mucho rato, el programa se cierra solo.
const latido = `<script>(()=>{const l=()=>fetch('/__latido',{method:'POST',keepalive:true}).catch(()=>{});l();setInterval(l,30000);})();</script></body>`

func servir(sitio fs.FS, ultimo *atomic.Int64) http.Handler {
	m := http.NewServeMux()
	m.HandleFunc("/__penumbra", func(w http.ResponseWriter, r *http.Request) { io.WriteString(w, "penumbra") })
	m.HandleFunc("/__latido", func(w http.ResponseWriter, r *http.Request) {
		ultimo.Store(time.Now().Unix())
		w.WriteHeader(http.StatusNoContent)
	})
	m.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		nombre := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if nombre == "" {
			nombre = "index.html"
		}
		datos, err := fs.ReadFile(sitio, nombre)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		ext := strings.ToLower(path.Ext(nombre))
		tipo, ok := tipos[ext]
		if !ok {
			tipo = mime.TypeByExtension(ext)
		}
		if tipo != "" {
			w.Header().Set("Content-Type", tipo)
		}
		w.Header().Set("Cache-Control", "no-cache")
		if ext == ".html" {
			datos = bytes.Replace(datos, []byte("</body>"), []byte(latido), 1)
		}
		w.Write(datos)
	})
	return m
}

func abrirNavegador(url string) error {
	switch runtime.GOOS {
	case "windows":
		return exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		return exec.Command("open", url).Start()
	default:
		return exec.Command("xdg-open", url).Start()
	}
}

func yaAbierto(url string) bool {
	c := http.Client{Timeout: 700 * time.Millisecond}
	r, err := c.Get(url + "__penumbra")
	if err != nil {
		return false
	}
	defer r.Body.Close()
	b, _ := io.ReadAll(r.Body)
	return string(b) == "penumbra"
}

func main() {
	sinAbrir := flag.Bool("sin-abrir", false, "no abre el navegador")
	espera := flag.Duration("espera", 15*time.Minute, "cuánto seguir abierto sin ninguna página")
	flag.Parse()

	sitio, err := fs.Sub(todo, "sitio")
	if err != nil {
		fmt.Println("El programa está dañado:", err)
		os.Exit(1)
	}
	dir := fmt.Sprintf("http://127.0.0.1:%d/", puerto)
	if yaAbierto(dir) { // ya estaba en marcha: solo hay que volver a abrir la página
		if !*sinAbrir {
			abrirNavegador(dir)
		}
		fmt.Println("Penumbra ya estaba abierto en", dir)
		return
	}
	oyente, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", puerto))
	if err != nil { // el puerto lo usa otro programa: funciona igual, pero el progreso irá a otra dirección
		oyente, err = net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			fmt.Println("No se pudo abrir ningún puerto local:", err)
			os.Exit(1)
		}
		dir = fmt.Sprintf("http://%s/", oyente.Addr())
		fmt.Println("Aviso: el puerto habitual está ocupado, así que el progreso guardado no aparecerá en esta sesión.")
	}
	var ultimo atomic.Int64
	ultimo.Store(time.Now().Unix())
	go func() {
		for range time.Tick(time.Second) {
			if time.Since(time.Unix(ultimo.Load(), 0)) > *espera {
				os.Exit(0)
			}
		}
	}()
	fmt.Println("Penumbra está abierto en", dir)
	fmt.Println("Cierra esta ventana para salir. Si cierras el navegador, se cerrará solo al cabo de un rato.")
	if !*sinAbrir {
		if err := abrirNavegador(dir); err != nil {
			fmt.Println("No se pudo abrir el navegador. Abre tú esta dirección:", dir)
		}
	}
	if err := http.Serve(oyente, servir(sitio, &ultimo)); err != nil {
		fmt.Println("Error:", err)
		os.Exit(1)
	}
}
