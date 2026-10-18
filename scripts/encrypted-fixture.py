"""Optional regeneration of the real password-protected, synthetic rejection fixture.

Requires pypdf==6.15.0. This password protects fake test data, not an account.
The application itself has no Python dependency.
"""
from pypdf import PdfReader, PdfWriter

reader = PdfReader("public/samples/reportbatch-sample.pdf")
writer = PdfWriter()
writer.add_page(reader.pages[0])
writer.encrypt("synthetic-test-password", algorithm="RC4-128")
with open("tests/fixtures/encrypted.pdf", "wb") as output:
    writer.write(output)
print("Encrypted synthetic rejection fixture regenerated.")
