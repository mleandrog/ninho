import os
import sys

# Adiciona o diretório raiz ao path para importar módulos se necessário
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def main():
    """
    Função principal do script de execução.
    Deve ser determinística e lidar com erros de forma graciosa.
    """
    print("Iniciando execução do script de exemplo...")
    
    # Exemplo de verificação de variável de ambiente
    # api_key = os.getenv("OPENAI_API_KEY")
    # if not api_key:
    #     print("Erro: OPENAI_API_KEY não configurada.")
    #     sys.exit(1)

    # Lógica de execução aqui
    try:
        # Simulação de trabalho
        output_path = os.path.join(".tmp", "output_exemplo.txt")
        
        # Cria o diretório .tmp se não existir (redundância defensiva)
        os.makedirs(".tmp", exist_ok=True)
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("Execução concluída com sucesso.\n")
            
        print(f"Sucesso: Arquivo gerado em {output_path}")
        
    except Exception as e:
        print(f"Erro crítico: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
