Shader "UI/Glassmorphism"
{
    Properties
    {
        [PerRendererData] _MainTex ("Sprite Texture", 2D) = "white" {}
        _Color ("Tint", Color) = (0.094, 0.094, 0.157, 0.85)
        _BorderColor ("Border Color", Color) = (0.376, 0.376, 0.502, 0.4)
        _BorderWidth ("Border Width", Range(0, 10)) = 1.5
        _CornerRadius ("Corner Radius", Range(0, 100)) = 16
        _BlurAmount ("Blur Amount", Range(0, 1)) = 0.1
        
        _StencilComp ("Stencil Comparison", Float) = 8
        _Stencil ("Stencil ID", Float) = 0
        _StencilOp ("Stencil Operation", Float) = 0
        _StencilWriteMask ("Stencil Write Mask", Float) = 255
        _StencilReadMask ("Stencil Read Mask", Float) = 255
        _ColorMask ("Color Mask", Float) = 15
    }

    SubShader
    {
        Tags
        {
            "Queue"="Transparent"
            "IgnoreProjector"="True"
            "RenderType"="Transparent"
            "PreviewType"="Plane"
            "CanUseSpriteAtlas"="True"
        }

        Stencil
        {
            Ref [_Stencil]
            Comp [_StencilComp]
            Pass [_StencilOp]
            ReadMask [_StencilReadMask]
            WriteMask [_StencilWriteMask]
        }

        Cull Off
        Lighting Off
        ZWrite Off
        ZTest [unity_GUIZTestMode]
        Blend SrcAlpha OneMinusSrcAlpha
        ColorMask [_ColorMask]

        Pass
        {
            Name "Default"
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 2.0

            #include "UnityCG.cginc"
            #include "UnityUI.cginc"

            #pragma multi_compile_local _ UNITY_UI_CLIP_RECT
            #pragma multi_compile_local _ UNITY_UI_ALPHACLIP

            struct appdata_t
            {
                float4 vertex   : POSITION;
                float4 color    : COLOR;
                float2 texcoord : TEXCOORD0;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct v2f
            {
                float4 vertex   : SV_POSITION;
                fixed4 color    : COLOR;
                float2 texcoord : TEXCOORD0;
                float4 worldPosition : TEXCOORD1;
                float2 localPos : TEXCOORD2;
                UNITY_VERTEX_OUTPUT_STEREO
            };

            sampler2D _MainTex;
            fixed4 _Color;
            fixed4 _BorderColor;
            float _BorderWidth;
            float _CornerRadius;
            float _BlurAmount;
            fixed4 _TextureSampleAdd;
            float4 _ClipRect;
            float4 _MainTex_ST;

            v2f vert(appdata_t v)
            {
                v2f OUT;
                UNITY_SETUP_INSTANCE_ID(v);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(OUT);
                OUT.worldPosition = v.vertex;
                OUT.vertex = UnityObjectToClipPos(OUT.worldPosition);
                OUT.texcoord = TRANSFORM_TEX(v.texcoord, _MainTex);
                OUT.color = v.color * _Color;
                OUT.localPos = v.texcoord;
                return OUT;
            }

            // Signed distance function for rounded rectangle
            float roundedRectSDF(float2 pos, float2 size, float radius)
            {
                float2 q = abs(pos) - size + radius;
                return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
            }

            fixed4 frag(v2f IN) : SV_Target
            {
                // Calculate position relative to center (-0.5 to 0.5)
                float2 pos = IN.localPos - 0.5;
                
                // Assume a reasonable aspect ratio (will be corrected by Unity's UI sizing)
                float2 size = float2(0.5, 0.5);
                
                // Normalize corner radius (as percentage of smaller dimension)
                float normalizedRadius = _CornerRadius * 0.005;
                
                // Calculate SDF
                float dist = roundedRectSDF(pos, size - normalizedRadius, normalizedRadius);
                
                // Anti-aliased edge
                float edgeWidth = 0.005;
                float alpha = 1.0 - smoothstep(-edgeWidth, edgeWidth, dist);
                
                // Border
                float borderDist = abs(dist) - _BorderWidth * 0.002;
                float borderAlpha = 1.0 - smoothstep(-edgeWidth, edgeWidth, borderDist);
                borderAlpha *= step(dist, 0.0); // Only inside the shape
                
                // Sample texture with slight blur effect (fake blur with offset samples)
                half4 color = tex2D(_MainTex, IN.texcoord) + _TextureSampleAdd;
                
                // Add blur simulation
                float2 blurOffset = float2(_BlurAmount * 0.01, _BlurAmount * 0.01);
                color += tex2D(_MainTex, IN.texcoord + blurOffset) + _TextureSampleAdd;
                color += tex2D(_MainTex, IN.texcoord - blurOffset) + _TextureSampleAdd;
                color += tex2D(_MainTex, IN.texcoord + float2(blurOffset.x, -blurOffset.y)) + _TextureSampleAdd;
                color += tex2D(_MainTex, IN.texcoord + float2(-blurOffset.x, blurOffset.y)) + _TextureSampleAdd;
                color *= 0.2; // Average
                
                // Apply tint
                color *= IN.color;
                
                // Mix in border color
                color.rgb = lerp(color.rgb, _BorderColor.rgb, borderAlpha * _BorderColor.a);
                
                // Apply rounded corner alpha
                color.a *= alpha;

                #ifdef UNITY_UI_CLIP_RECT
                color.a *= UnityGet2DClipping(IN.worldPosition.xy, _ClipRect);
                #endif

                #ifdef UNITY_UI_ALPHACLIP
                clip(color.a - 0.001);
                #endif

                return color;
            }
            ENDCG
        }
    }
}
