.PHONY: all clean

DOCS = cv-eu-en.tex cv-eu-it.tex cv-it-en.tex cv-it-it.tex
PDFS = $(DOCS:.tex=.pdf)

all: $(PDFS)

%.pdf: %.tex cv-style.sty content/*.tex
	pdflatex -interaction=nonstopmode -halt-on-error $<
	pdflatex -interaction=nonstopmode -halt-on-error $<

clean:
	rm -f *.aux *.log *.out *.pdf
