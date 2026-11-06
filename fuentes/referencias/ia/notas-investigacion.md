# Notas verificadas para la ruta de IA (región del amanecer)

Leídas de los artículos (arXiv HTML/PDF) el 2026-11-06. Lo marcado (mem) no se pudo contrastar con el texto original.

## Lógica difusa diferenciable: van Krieken, Acar, van Harmelen, Artificial Intelligence 2022 (arXiv 2002.06100)
- Pérdida: L = -Σ_φ e_θ(φ). Fórmula → valor de verdad recursivo; ∀ con agregador.
- Derivadas: T_G: 1 si a<b, 0 si no ("single-passing"). T_P: b. T_LK: 1 si a+b>1, 0 si no (se anula en media dominio). S_P: 1-b.
- Reichenbach I(a,c)=1-a+ac: ∂c=a (MP), -∂a=1-c (MT). Desequilibrio: muchos casos a≈0,c≈0 → MT gana. Ej. cuervos.
- Gödel: derivada respecto al antecedente siempre 0: nunca usa MT. Goguen: 1/a, c/a².
- Recomendación: ∀ con log-producto; ∃ con media generalizada p∈[1,2]; S-implicaciones mejor que R-. Único simétrico bueno: producto + Reichenbach.
- Sigmoidal: s=9, b0=-1/2. Exactitud (same problem): Reichenbach 96,3; sigmoidal 96,3 con Adam, 97,3 con SGD; Gödel 90,5; Goguen 93,6. Ladder 98,9/99,2: "not currently competitive".
- Las mejores combinaciones ya no cumplen las leyes lógicas.
## LTN: Badreddine et al., Artificial Intelligence 303 (2022) (arXiv 2012.13635)
- Predicado = red → [0,1]. T_P, S_P, N_S, I_R. ∃: A_pM=(1/n Σ a^p)^(1/p). ∀: A_pME=1-(1/n Σ(1-a)^p)^(1/p). p=2: 1-RMSE.
- Estables: π0(a)=(1-ε)a+ε, π1(a)=(1-ε)a. Problemas: T_P a=b=0; S_P a=b=1; I_R a=0,b=1; A_pM explota si Σa^p→0; A_pME si Σ(1-a)^p→0.
- Pérdida: 1-SatAgg. Horario de p∃: de 1 a 6 con las épocas; p alto al inicio da malos resultados.
- 100% de exactitud no es satisfacción máxima (ej. umbral 0,5, confianza 0,7 → sat 0,7).
## Conceptos
- Koh 2020: independiente / secuencial / conjunto. Joint: L_Y+λΣL_C. Intervención: sustituir ĉ_j por el verdadero. OAI: 2 conceptos bajan RMSE de >0,4 a ≈0,3. Tabla: CUB error Ind .240 Seq .243 Joint .199 Std .175.
- Mahinpei 2021: fuga: la probabilidad blanda codifica distancia a la frontera. MNIST paridad con conceptos "es 4","es 5" sin 4 ni 5: 69 % (esperado 50 %).
- DCR Barbiero 2023: ŷ=∧ ℓ^r; polaridad φ, relevancia ψ; sus experimentos usan Gödel.
- CMR Debot 2024: libro de reglas; roles P,N,I; p(y|c,s)=Π(p(I)+p(P)1[c=1]+p(N)1[c=0]). Universal si n_R≥3.
- CCD: ℓ=πμ+(1-π)(1-μ); w=Π(1-m+mℓ); w̄; Proposición 1.
## Calibración
- Guo 2017: P(Ŷ=Y|P̂=p)=p. ECE=Σ|B|/n |acc-conf|. MCE=max. T: softmax(z/T), no cambia exactitud. CIFAR-100 ResNet110: ECE 16,53→1,26.
- Nixon 2019: ECE: solo clase predicha, bins fijos, sesgo-varianza, cancelación dentro del bin; propone rangos adaptativos, ACE.
- Isotónica: Zadrozny-Elkan 2002; PAV: bloques adyacentes que violan el orden se funden en su media (ponderada).
- OWA Yager 1988: Σ w_j b_j con b ordenado de mayor a menor. orness=1/(n-1) Σ(n-j)w_j.
- Group lasso (Yuan-Lin 2006): prox β_g=max(0,1-λ/‖z_g‖)z_g (mem en cuanto a Yuan-Lin; es resultado estándar).
- Wachter 2017: min λ(f(x')-y')²+d(x,x').
- Fréchet-Hoeffding (mem, estándar): max(0,a+b-1) ≤ P(A∧B) ≤ min(a,b): las normas T de Łukasiewicz y Gödel son las cotas.
