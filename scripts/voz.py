# Narración local: convierte varias frases a WAV cargando la voz una sola vez. Sin internet ni APIs: el modelo de voz
# es un archivo que vive en la máquina (.tools/ en local, caché en GitHub Actions).
#   Kokoro (github.com/thewh1teagle/kokoro-onnx): {"motor": "kokoro", "voz": "em_alex", "modelo": "kokoro-v1.0.onnx", "voces": "voices-v1.0.bin"}
#   Piper  (github.com/OHF-Voice/piper1-gpl):     {"motor": "piper", "modelo": "es_MX-claude-high.onnx"}
# Más: {"dir": "carpeta", "textos": ["...", ...], "velocidad": 1.0}. Salida: dir/000.wav, dir/001.wav, ... en el mismo orden
import json
import os
import sys
import wave

pedido = json.load(sys.stdin)
os.makedirs(pedido["dir"], exist_ok=True)
velocidad = float(pedido.get("velocidad", 1.0))
salida = lambda i: os.path.join(pedido["dir"], f"{i:03d}.wav")

if pedido["motor"] == "kokoro":
    import numpy as np
    from kokoro_onnx import Kokoro

    k = Kokoro(pedido["modelo"], pedido["voces"])
    for i, texto in enumerate(pedido["textos"]):
        audio, sr = k.create(texto, voice=pedido["voz"], speed=velocidad, lang=pedido.get("idioma", "es"))
        pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes()
        with wave.open(salida(i), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm)
else:
    from piper import PiperVoice, SynthesisConfig

    voz = PiperVoice.load(pedido["modelo"])
    config = SynthesisConfig(length_scale=1 / velocidad, noise_scale=0.6, noise_w_scale=0.8)
    for i, texto in enumerate(pedido["textos"]):
        with wave.open(salida(i), "wb") as w:
            voz.synthesize_wav(texto, w, syn_config=config)
print(len(pedido["textos"]))
