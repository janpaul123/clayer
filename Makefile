all: clayer.css examples/cal/cal.css

clayer.css: clayer.less
	node_modules/.bin/lessc clayer.less > clayer.css

examples/cal/cal.css: examples/cal/cal.less clayer.less
	node_modules/.bin/lessc examples/cal/cal.less > examples/cal/cal.css

.PHONY: all
