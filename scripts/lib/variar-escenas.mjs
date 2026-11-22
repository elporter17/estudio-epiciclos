// Evita dos escenas del mismo tipo seguidas en un guion (se ve repetitivo): si una escena «foco» viene justo después de otra,
// pasa a una de estas tres (con el mismo texto y objeto), eligiendo una que no sea igual a la de antes ni a la de después y
// rotando entre ellas. Lo usan los generadores de guiones.
export function variarEscenas(escenas) {
  const alternas = [{ tipo: 'lluvia', cantidad: 90 }, { tipo: 'cuadricula', lado: 10 }, { tipo: 'pila', cantidad: 90 }];
  let k = 0;
  return escenas.map((e, i) => {
    if (i > 0 && e.tipo === 'foco' && escenas[i - 1].tipo === 'foco') {
      const vecinas = [escenas[i - 1].tipo, escenas[i + 1]?.tipo], libres = alternas.filter((a) => !vecinas.includes(a.tipo)), a = libres[k++ % libres.length];
      const { cantidad, ...resto } = e; escenas[i] = { ...resto, ...a }; return escenas[i];
    }
    return e;
  });
}
