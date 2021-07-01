def calculate_total_pages(n, d):
    '''
    Returns total pages = n // d but with ceiling functionality instead of floor (1.5 will be changed to 2).
    Returns 0 if denominator is 0.
    '''
    if d == 0:
        return 0
    # floor functionality works as ceiling if we make the denominator negative
    return -(n // -d)
