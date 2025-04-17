def tamper_file(file_path):
    with open(file_path, 'rb') as f:
        content = bytearray(f.read())

    # Your AES-encrypted key is around 512 bytes. Let's safely skip to byte 600 to modify ciphertext
    if len(content) > 600:
        content[600] ^= 0xFF
    else:
        print("File too small to tamper at byte 600.")

    with open(file_path, 'wb') as f:
        f.write(content)

tamper_file("media/uploads/cintajpg.jpg")
