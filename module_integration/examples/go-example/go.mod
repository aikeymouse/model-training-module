module go-training-example

go 1.21

//require github.com/aikeymouse/model-training-module/module_integration/examples/go-module v1.0.1

require github.com/aikeymouse/model-training-module/module_integration/examples/go-module v0.0.0-00010101000000-000000000000

require (
	github.com/gorilla/websocket v1.5.1 // indirect
	golang.org/x/net v0.17.0 // indirect
)

// Use local development version instead of published version
replace github.com/aikeymouse/model-training-module/module_integration/examples/go-module => ../go-module
