from __future__ import annotations

import xml.etree.ElementTree as ET

from fastapi import HTTPException, status

SUMMARY_POLYLINE_STEP = 10


def _encode_value(value: int) -> str:
    value = ~(value << 1) if value < 0 else value << 1
    chunks: list[str] = []
    while value >= 0x20:
        chunks.append(chr((0x20 | (value & 0x1F)) + 63))
        value >>= 5
    chunks.append(chr(value + 63))
    return "".join(chunks)


def encode_polyline(points: list[tuple[float, float]]) -> str:
    last_lat = 0
    last_lon = 0
    encoded: list[str] = []

    for latitude, longitude in points:
        lat = int(round(latitude * 1e5))
        lon = int(round(longitude * 1e5))
        encoded.append(_encode_value(lat - last_lat))
        encoded.append(_encode_value(lon - last_lon))
        last_lat = lat
        last_lon = lon

    return "".join(encoded)


def _downsample_points(points: list[tuple[float, float]], step: int = SUMMARY_POLYLINE_STEP) -> list[tuple[float, float]]:
    if len(points) <= 2 or step <= 1:
        return points

    sampled = [points[0]]
    sampled.extend(points[index] for index in range(step, len(points) - 1, step))
    if sampled[-1] != points[-1]:
        sampled.append(points[-1])
    return sampled


def _parse_float(value: str | None, label: str) -> float:
    if value is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"GPX point is missing {label}")
    try:
        return float(value)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"GPX point has invalid {label}") from exc


def parse_gpx_points(payload: bytes) -> list[tuple[float, float]]:
    try:
        root = ET.fromstring(payload)
    except ET.ParseError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid GPX file") from exc

    track_points = root.findall('.//{*}trkpt')
    route_points = root.findall('.//{*}rtept')
    point_elements = track_points or route_points

    if not point_elements:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GPX file does not contain track points")

    points: list[tuple[float, float]] = []
    for point in point_elements:
        latitude = _parse_float(point.attrib.get('lat'), 'latitude')
        longitude = _parse_float(point.attrib.get('lon'), 'longitude')
        points.append((latitude, longitude))

    if len(points) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GPX file must contain at least two points")

    return points


def build_polylines_from_gpx(payload: bytes) -> tuple[str, str]:
    points = parse_gpx_points(payload)
    full_polyline = encode_polyline(points)
    summary_polyline = encode_polyline(_downsample_points(points))
    return full_polyline, summary_polyline


def build_trip_polyline_from_gpx(payload: bytes, *, compress: bool) -> str:
    points = parse_gpx_points(payload)
    selected_points = _downsample_points(points) if compress else points
    return encode_polyline(selected_points)
