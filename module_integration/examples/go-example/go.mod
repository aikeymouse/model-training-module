module go-training-example

go 1.21

require github.com/aikeymouse/model-training-module/module_integration/examples/go-module v1.1.0

require (
	github.com/gorilla/websocket v1.5.1 // indirect
	golang.org/x/net v0.17.0 // indirect
)

// Use local development version instead of published version
//replace github.com/aikeymouse/model-training-module/module_integration/examples/go-module => ../go-module
