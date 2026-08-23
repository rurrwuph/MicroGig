package com.microgig.payload.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveStatsResponse implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long workRequestId;
    private Long activeViewers;
    private Long totalUniqueViewers;
}
