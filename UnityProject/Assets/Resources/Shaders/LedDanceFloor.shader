Shader "TikTokLiveGame/LedDanceFloor"
{
    Properties { _Bpm ("BPM", Float) = 128 }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            float _Bpm;
            float _ClubAudioBass, _ClubAudioEnergy, _ClubAudioPulse;
            struct appdata { float4 vertex : POSITION; };
            struct v2f { float4 vertex : SV_POSITION; float3 world : TEXCOORD0; };
            v2f vert(appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.world = mul(unity_ObjectToWorld, v.vertex).xyz;
                return o;
            }
            fixed4 frag(v2f i) : SV_Target
            {
                float2 uv = i.world.xz / 0.9;
                float2 cell = floor(uv);
                float2 edge = min(frac(uv), 1.0 - frac(uv));
                float gap = smoothstep(0.025, 0.06, min(edge.x, edge.y));
                float time = _Time.y;
                float seed = frac(sin(dot(cell, float2(12.9898, 78.233))) * 43758.5453);
                float beat = time * _Bpm / 60.0;
                float radius = length(cell * float2(0.7, 0.9));
                float mode = fmod(floor(beat / 16.0), 4.0);
                float pattern = seed;
                float energy = 0.5 + 0.5 * sin(beat * 1.5 + cell.x * 0.7 + cell.y * 0.5);
                if (mode > 0.5 && mode < 1.5)
                {
                    pattern = cell.x * 0.09 + cell.y * 0.06;
                    energy = 0.5 + 0.5 * sin(cell.x * 0.9 + cell.y * 0.6 - beat * 1.5);
                }
                else if (mode > 1.5 && mode < 2.5)
                {
                    pattern = radius * 0.07;
                    energy = 0.5 + 0.5 * sin(radius * 1.3 - beat * 1.5);
                }
                else if (mode > 2.5)
                {
                    pattern = atan2(cell.y, cell.x) / 6.2832 + radius * 0.025;
                    energy = 0.5 + 0.5 * sin((abs(cell.x) + abs(cell.y)) * 0.8 - beat);
                }
                float hue = frac(pattern + beat * 0.025);
                float3 rgb = saturate(abs(frac(hue + float3(0, 0.6667, 0.3333)) * 6.0 - 3.0) - 1.0);
                float wave = 0.25 + 0.55 * energy * energy;
                wave *= 0.6 + _ClubAudioEnergy * 0.8 + _ClubAudioPulse * 1.3;
                wave += pow(saturate(sin(radius * 0.9 - time * 5.0)), 12) * _ClubAudioPulse * 0.5;
                float vignette = 1.0 - smoothstep(6, 19, length(i.world.xz));
                float3 color = lerp(float3(0.005, 0.009, 0.02), (rgb * 0.85 + 0.08) * wave, gap);
                return fixed4(color * (0.65 + vignette * 0.35), 1);
            }
            ENDCG
        }
    }
}
