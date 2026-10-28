# Catálogo oficial — OSS Kimonos

O arquivo `catalogo.json` é a fonte de dados dos produtos da página `loja.html`.

## Como cadastrar um produto

Inclua um objeto dentro da lista `produtos` e mantenha `versao: 1`.

**Modelo ilustrativo de preenchimento (NÃO é um produto real, não deve ser publicado sem conferência):**

```json
{
  "id": "CODIGO-REAL-DO-PRODUTO",
  "categoria": "kimonos",
  "nome": "Nome real do produto",
  "descricao": "Descrição confirmada do modelo",
  "imagem": "/assets/foto-real-do-produto.webp",
  "preco_brl": 0,
  "preco_confirmado": false,
  "tamanhos": [],
  "status": "rascunho"
}
```

Categorias aceitas:
`kimonos`, `faixas`, `fight-wear`, `rashguard`, `camisas`, `bones`, `bermuda`, `moletom`, `mochilas`.

Regras:

1. Use `status: "rascunho"` até conferir a descrição, os tamanhos, a foto e a disponibilidade com a OSS.
2. Somente `status: "publicado"` faz o produto aparecer no site. Precisa ter `id`, `nome` e `categoria` válidos.
3. Configure `preco_confirmado: true` **somente** com preço real atualizado e `preco_brl` numérico. Caso contrário, aparece "Preço sob consulta".
4. A foto deve estar na pasta `assets` do repositório e usar caminho `/assets/nome-da-foto.png` (aceita PNG, JPG e WebP). Não utilize foto de concorrente.
5. O site **não confirma estoque**, não reserva produtos, não calcula frete e não cobra pagamentos. A compra continua por atendimento no WhatsApp oficial (19) 99712-1912.
6. Ao atualizar `catalogo.json` no GitHub, o Render fará um novo deploy automaticamente. Não é necessário editar o HTML.
7. Não adicione credenciais, senhas, dados de clientes ou tokens ao catálogo público.

### Estrutura de navegação

A Loja exibe nove categorias em um seletor compacto. Se uma categoria possuir produtos publicados no JSON, esses itens aparecem em cards com foto, informações confirmadas e contato direto. Sem itens publicados, ela mostra a consulta de disponibilidade, sem inventar estoque.

A navegação usa a mesma aba do navegador e pode ser compartilhada por categoria, por exemplo: `/loja.html#faixas`.

### Próxima etapa

Para transformar a vitrine em um catálogo de produtos real, reunir para cada item: nome, código, foto oficial, tamanhos, preço validado e disponibilidade atual. Não publicar dados aproximados como confirmados.
