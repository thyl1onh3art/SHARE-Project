#!/usr/bin/env python3

def weird_or_not(n: int) -> str:
    if n % 2 == 1:
        return "Weird"
    if 2 <= n <= 5:
        return "Not Weird"
    if 6 <= n <= 20:
        return "Weird"
    return "Not Weird"


if __name__ == "__main__":
    n = int(input().strip())
    print(weird_or_not(n))
