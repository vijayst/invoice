# Invoice

<div class="meta">

| Name | Value |
|----|-----:|
| **Invoice #** | {{invoiceNumber}} |
| **Date** | {{date}} |
| **Due Date** | {{dueDate}} |
| **Amount** | {{total}} {{currency}} |

</div>

**Billed From:**  
{{from.name}}  
{{from.company}}  
{{from.address}}  

**Billed To:**  
{{to.name}}  
{{to.company}}  
{{to.address}}  

---  

## Invoice Details

| Description                              | Amount ({{currency}}) |
|------------------------------------------|------------:|
{{#each lineItems}}
| {{description}} | **${{amount}}** |
{{/each}}

**Total:** **${{total}} {{currency}}**

---  

## Payment Instructions (Wire Transfer)

<div class="wire">

| Name | Value |
|---|---:|
| **Name** | {{payment.name}} |
| **Routing #** | {{payment.routingNumber}} | 
| **Account #** | {{payment.accountNumber}} |
| **Bank address** | {{payment.bankAddress}} |

</div>

---  

*Please remit payment within {{paymentTermsDays}} days of the invoice date.*  
*Thank you for your business!*
