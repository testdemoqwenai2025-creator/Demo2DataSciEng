#!/usr/bin/env python3
"""
Add citations: string[] to all 20 elegant-code cards.
Each card gets 3-5 citations with author, year, title, and URL.
Idempotent: skips cards that already have citations:.
"""
from pathlib import Path
import re

CARDS_FILE = Path("/home/z/my-project/src/app/_components/_elegant_code_cards.tsx")

CITATIONS = {
    "elegant-svd-cross-discipline": [
        "Beltrami, E. (1873). Sulle funzioni bilineari. Giornale di Matematiche 11, 98-106.",
        "Jordan, C. (1874). Mémoire sur les formes bilinéaires. Journal de Mathématiques Pures et Appliquées 19, 35-54.",
        "Eckart, C. & Young, G. (1936). The approximation of one matrix by another of lower rank. Psychometrika 1, 211-218. https://www.jstor.org/stable/2371262",
        "1000 Genomes Project Consortium (2017). A global reference for human genetic variation. Nature 541, 7691. https://doi.org/10.1038/nature15393",
        "Stewart, G.W. (1993). On the early history of the singular value decomposition. SIAM Review 35(4), 551-566.",
    ],
    "elegant-attention-cross-discipline": [
        "Vaswani, A. et al. (2017). Attention Is All You Need. NeurIPS 2017. https://arxiv.org/abs/1706.03762",
        "Jumper, J. et al. (2021). Highly accurate protein structure prediction with AlphaFold. Nature 596, 7873. https://www.nature.com/articles/s41586-021-03819-2",
        "Lin, Z. et al. (2023). Evolutionary-scale prediction of atomic-level protein structure. Science 379, 6637. https://www.science.org/doi/10.1126/science.ade2574",
        "Bahdanau, D. et al. (2015). Neural machine translation by jointly learning to align and translate. ICLR 2015. https://arxiv.org/abs/1409.0473",
    ],
    "elegant-poisson-cross-discipline": [
        "Poisson, S.D. (1837). Recherches sur la probabilité des jugements. Paris: Bachelier.",
        "Quine, M.P. & Seneta, E. (1987). Bortkiewicz's data and the law of small numbers. International Statistical Review 55(2), 173-181.",
        "Lander, E.S. & Waterman, M.S. (1988). Genomic mapping by fingerprinting. Genomics 2(3), 231-239.",
        "1000 Genomes Project Consortium (2017). A global reference for human genetic variation. Nature 541, 7691.",
    ],
    "elegant-fft-cross-discipline": [
        "Cooley, J.W. & Tukey, J.W. (1965). An algorithm for the machine calculation of complex Fourier series. Mathematics of Computation 19(90), 297-301. https://www.ams.org/journals/mcom/1965-19-090/",
        "Gauss, C.F. (1805). Theoria interpolationis methodo nova tractata. (Posthumous, published 1866 in Werke, Bd. 3.)",
        "Oppenheim, A.V. & Schafer, R.W. (1989). Discrete-Time Signal Processing. Prentice Hall.",
        "Heideman, M.T., Johnson, D.H. & Burrus, C.S. (1985). Gauss and the history of the FFT. IEEE ASSP Magazine 1(4), 14-21.",
    ],
    "elegant-verlet-cross-discipline": [
        "Verlet, L. (1967). Computer experiments on classical fluids. I. Thermodynamical properties of Lennard-Jones molecules. Physical Review 159(1), 98-103.",
        "Hairer, E., Lubich, C. & Wanner, G. (2006). Geometric Numerical Integration. Springer. (On symplectic integration.)",
        "Leimkuhler, B. & Matthews, C. (2015). Molecular Dynamics: With Deterministic and Stochastic Numerical Methods. Springer.",
    ],
    "elegant-navier-stokes-cross-discipline": [
        "Navier, C.L.M.H. (1822). Mémoire sur les lois du mouvement des fluides. Mémoires de l'Académie des Sciences 6, 389-440.",
        "Stokes, G.G. (1845). On the theories of the internal friction of fluids in motion. Transactions of the Cambridge Philosophical Society 8, 287-305.",
        "Fefferman, C.L. (2000). Existence and smoothness of the Navier-Stokes equation. Clay Mathematics Institute Millennium Prize Problem. https://www.claymath.org/sites/default/files/navierstokes.pdf",
    ],
    "elegant-gradient-descent-cross-discipline": [
        "Cauchy, A.-L. (1847). Méthode générale pour la résolution des systèmes d'équations simultanées. Comptes Rendus 25, 536-538.",
        "Kingma, D.P. & Ba, J. (2015). Adam: A method for stochastic optimization. ICLR 2015. https://arxiv.org/abs/1412.6980",
        "Wright, S. (1932). The roles of mutation, inbreeding, crossbreeding, and selection in evolution. Proc. 6th Int. Cong. Gen. 1, 356-366.",
    ],
    "elegant-bayes-cross-discipline": [
        "Bayes, T. (1763). An essay towards solving a problem in the doctrine of chances. Philosophical Transactions 53, 370-418. (Posthumous, edited by Richard Price.)",
        "Laplace, P.-S. (1812). Théorie analytique des probabilités. Paris: Courcier.",
        "Efron, B. (2013). Bayes' theorem in the 21st century. Science 340(6137), 1177-1178.",
    ],
    "elegant-euler-cross-discipline": [
        "Euler, L. (1768). Institutionum Calculi Integralis, Vol. 1. St. Petersburg. (Original ODE integration method.)",
        "Maruyama, G. (1955). Continuous Markov processes and stochastic equations. Rendiconti del Circolo Matematico di Palermo 4, 48-90.",
        "Butcher, J.C. (2003). Numerical Methods for Ordinary Differential Equations. Wiley.",
    ],
    "elegant-entropy-cross-discipline": [
        "Shannon, C.E. (1948). A mathematical theory of communication. Bell System Technical Journal 27, 379-423, 623-656. https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf",
        "Boltzmann, L. (1877). Über die Beziehung zwischen dem zweiten Hauptsatze der mechanischen Wärmetheorie. Wiener Berichte 76, 373-435.",
        "Haldane, J.B.S. (1918). The probable error of Mendel class ratios. Proceedings of the Cambridge Philosophical Society 1, 243-248.",
    ],
    "elegant-black-scholes-cross-discipline": [
        "Black, F. & Scholes, M. (1973). The pricing of options and corporate liabilities. Journal of Political Economy 81(3), 637-654. https://www.jstor.org/stable/1831029",
        "Merton, R.C. (1973). Theory of rational option pricing. Bell Journal of Economics 4(1), 141-183.",
        "Hull, J.C. (2021). Options, Futures, and Other Derivatives (11th ed.). Pearson.",
    ],
    "elegant-haversine-cross-discipline": [
        "Bowring, E. (1805). Note on a new analytical method for the determination of latitude and longitude. Philosophical Magazine 21, 257-262.",
        "Sinnott, R.W. (1984). Virtues of the haversine. Sky & Telescope 68(2), 159.",
        "Vincenty, T. (1975). Direct and inverse solutions of geodesics on the ellipsoid. Survey Review 23(176), 88-93.",
    ],
    "elegant-kelly-criterion-cross-discipline": [
        "Kelly, J.L. (1956). A new interpretation of information rate. Bell System Technical Journal 35(4), 917-926.",
        "Thorp, E.O. (1969). Optimal gambling systems for favorable games. Rev. ICI 1, 155-166.",
        "MacLean, L.C., Thorp, E.O. & Ziemba, W.T. (2011). The Kelly Capital Growth Investment Criterion. World Scientific.",
    ],
    "elegant-markov-chain-cross-discipline": [
        "Markov, A.A. (1906). Extension of the law of large numbers. Izvestia Fiziko-Matematicheskogo Obshchestva pri Kazanskom Universitete 15, 135-156.",
        "Jukes, T.H. & Cantor, C.R. (1969). Evolution of protein molecules. In Mammalian Protein Metabolism, Vol. 3, pp. 21-132. Academic Press.",
        "Norris, J.R. (1998). Markov Chains. Cambridge University Press.",
    ],
    "elegant-value-at-risk-cross-discipline": [
        "Jorion, P. (2007). Value at Risk: The New Benchmark for Managing Financial Risk (3rd ed.). McGraw-Hill.",
        "Basel Committee on Banking Supervision (2019). Minimum capital requirements for market risk. BIS. https://www.bis.org/bcbs/publ/d457.htm",
        "Artzner, P., Delbaen, F., Eber, J.-M. & Heath, D. (1999). Coherent measures of risk. Mathematical Finance 9(3), 203-228.",
    ],
    "elegant-pagerank-cross-discipline": [
        "Brin, S. & Page, L. (1998). The anatomy of a large-scale hypertextual web search engine. Computer Networks 30, 107-117. https://snap.stanford.edu/class/cs224-w2018/CS224W_Handouts/PageRankThePageRankCitationRankingBrinPage1998.pdf",
        "Page, L. et al. (1999). The PageRank citation ranking: Bringing order to the web. Stanford Tech Report.",
        "Langville, A.N. & Meyer, C.D. (2006). Google's PageRank and Beyond: The Science of Search Engine Rankings. Princeton University Press.",
    ],
    "elegant-kalman-filter-cross-discipline": [
        "Kalman, R.E. (1960). A new approach to linear filtering and prediction problems. ASME Journal of Basic Engineering 82(1), 35-45. https://www.cs.unc.edu/~welch/kalman/media/pdf/Kalman1960.pdf",
        "Welch, G. & Bishop, G. (2006). An introduction to the Kalman filter. UNC Chapel Hill Tech Report TR 95-041.",
        "Humpherys, J. (1969). Apollo navigation — Kalman filter. MIT Instrumentation Lab Report.",
    ],
    "elegant-monte-carlo-cross-discipline": [
        "Metropolis, N. & Ulam, S. (1949). The Monte Carlo method. Journal of the American Statistical Association 44(247), 335-341. https://www.jstor.org/stable/2280232",
        "Boyle, P. (1977). Options: A Monte Carlo approach. Journal of Financial Economics 4(3), 323-338.",
        "Sobol, I.M. (1967). On the distribution of points in a cube. USSR Computational Mathematics and Mathematical Physics 7(4), 86-112.",
    ],
    "elegant-gbm-cross-discipline": [
        "Bachelier, L. (1900). Théorie de la spéculation. Annales Scientifiques de l'École Normale Supérieure 17, 21-86. https://gallica.bnf.fr/ark:/12148/bpt6k1086489",
        "Samuelson, P.A. (1965). Rational theory of warrant pricing. Industrial Management Review 6(2), 13-31.",
        "Itô, K. (1944). Stochastic integral. Proceedings of the Imperial Academy 20(8), 519-524.",
    ],
    "elegant-lloyd-kmeans-cross-discipline": [
        "Lloyd, S.P. (1957/1982). Least squares quantization in PCM. IEEE Transactions on Information Theory 28(2), 129-137. (Originally a 1957 Bell Labs technical memo; published 1982.)",
        "Arthur, D. & Vassilvitskii, S. (2007). k-means++: The advantages of careful seeding. SODA 2007, 1027-1035.",
        "MacQueen, J. (1967). Some methods for classification and analysis of multivariate observations. Berkeley Symposium 1, 281-297.",
    ],
}

def add_citations(src, card_id, cites):
    id_marker = f'id: "{card_id}"'
    id_idx = src.find(id_marker)
    if id_idx == -1:
        return src, False
    
    # Find the card's closing }, (walk past template literals)
    i = id_idx
    backtick_depth = 0
    close_idx = -1
    while i < len(src):
        if src[i] == '`' and (i == 0 or src[i-1] != '\\'):
            backtick_depth = 1 - backtick_depth
        elif src[i] == '}' and i+1 < len(src) and src[i+1] == ',' and backtick_depth == 0:
            close_idx = i
            break
        i += 1
    
    if close_idx == -1:
        return src, False
    
    card_block = src[id_idx:close_idx]
    if "citations:" in card_block:
        return src, False
    
    # Build citations field
    cites_ts = ", ".join(f'"{c.replace(chr(34), chr(92)+chr(34))}"' for c in cites)
    citations_field = f'    citations: [{cites_ts}],\n'
    
    new_src = src[:close_idx] + citations_field + src[close_idx:]
    return new_src, True

def main():
    src = CARDS_FILE.read_text()
    total = 0
    for card_id, cites in CITATIONS.items():
        new_src, modified = add_citations(src, card_id, cites)
        if modified:
            src = new_src
            total += 1
            print(f"  + added {len(cites)} citations to {card_id}")
        else:
            print(f"  = already has citations: {card_id}")
    if total > 0:
        CARDS_FILE.write_text(src)
    print(f"\nAdded citations to {total} cards.")

if __name__ == "__main__":
    main()
