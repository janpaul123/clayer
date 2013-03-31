all: clayer.css examples/cal.css

clayer.css: clayer.less
	node_modules/.bin/lessc clayer.less > clayer.css

examples/cal.css: examples/cal.less clayer.less
	node_modules/.bin/lessc examples/cal.less > examples/cal.css

.PHONY: all